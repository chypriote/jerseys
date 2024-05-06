<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Club;
use App\Entity\League;
use App\Enum\Crud;
use App\Form\LeagueType;
use App\Form\Type\ClubFromLeagueType;
use Doctrine\ORM\EntityManagerInterface;
use Koriym\HttpConstants\Method;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpClient\Exception\InvalidArgumentException;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/leagues', name: 'leagues.')]
class LeaguesController extends AbstractController
{
    #[Route('', name: Crud::LIST, methods: [Method::GET])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $leagues = $entityManager
            ->getRepository(League::class)
            ->findAll();

        return $this->render('admin/leagues/index.html.twig', [
            'leagues' => $leagues,
        ]);
    }

    #[Route(path: '/new', name: Crud::CREATE, methods: [Method::GET, Method::POST])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $league = new League();
        $form = $this->createForm(LeagueType::class, $league);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($league);
            $entityManager->flush();

            return $this->redirectToRoute('admin.leagues.show', ['slug' => $league->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/leagues/new.html.twig', [
            'league' => $league,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::SHOW, methods: [Method::GET])]
    public function show(League $league): Response
    {
        $club = new Club();
        $club->setLeague($league);
        $form = $this->createForm(ClubFromLeagueType::class, $club, ['league' => $league->getSlug()]);

        return $this->render('admin/leagues/show.html.twig', [
            'league' => $league,
            'clubForm' => $form,
        ]);
    }

    #[Route('/{slug}/edit', name: Crud::EDIT, methods: [Method::GET, Method::POST])]
    public function edit(Request $request, League $league, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(LeagueType::class, $league);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.leagues.show', ['slug' => $league->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/leagues/edit.html.twig', [
            'league' => $league,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}/club', name: 'create_club', methods: [Method::POST])]
    public function createClub(
        League $league,
        Request $request,
        EntityManagerInterface $entityManager,
        FilesystemOperator $storageClubs,
        SluggerInterface $slugger
    ): Response {
        $club = new Club();
        $form = $this->createForm(ClubFromLeagueType::class, $club, ['league' => $league->getSlug()]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $logo = $form->get('logo')->getData();
            if (!$logo instanceof File) {
                throw new InvalidArgumentException();
            }
            try {
                $fileName = $slugger->slug($club->getName())->lower().'-'.uniqid('', true).'.'.$logo->guessExtension();
                $storageClubs->write($fileName, $logo->getContent());
            } catch (FilesystemException $e) {
                throw new InvalidArgumentException($e->getMessage());
            }
            $club->setLogo($fileName);
            $entityManager->persist($club);
            $entityManager->flush();

            return $this->redirectToRoute('admin.leagues.show', ['slug' => $league->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/leagues/edit.html.twig', [
            'league' => $league,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::DELETE, methods: [Method::POST])]
    public function delete(Request $request, League $league, EntityManagerInterface $entityManager): Response
    {
        $token = $request->getPayload()->get('_token');
        if ($token && $this->isCsrfTokenValid('delete'.$league->getId(), (string) $token)) {
            $entityManager->remove($league);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin.leagues.list', [], Response::HTTP_SEE_OTHER);
    }
}
