<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\League;
use App\Enum\Crud;
use App\Form\LeagueType;
use Doctrine\ORM\EntityManagerInterface;
use Koriym\HttpConstants\Method;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

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
        return $this->render('admin/leagues/show.html.twig', [
            'league' => $league,
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
