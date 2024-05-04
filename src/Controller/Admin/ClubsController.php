<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Club;
use App\Enum\Crud;
use App\Form\ClubType;
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

#[Route('/clubs', name: 'clubs.')]
class ClubsController extends AbstractController
{
    #[Route('', name: Crud::LIST, methods: [Method::GET])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $clubs = $entityManager
            ->getRepository(Club::class)
            ->findAll();

        return $this->render('admin/clubs/index.html.twig', [
            'clubs' => $clubs,
        ]);
    }

    #[Route('/new', name: Crud::CREATE, methods: [Method::GET, Method::POST])]
    public function new(
        Request $request, EntityManagerInterface $entityManager,
        FilesystemOperator $storageClubs,
        SluggerInterface $slugger
    ): Response {
        $club = new Club();
        $form = $this->createForm(ClubType::class, $club);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $logo = $form->get('logo')->getData();
            if (!$logo instanceof File) {
                throw new InvalidArgumentException();
            }
            try {
                $fileName = $slugger->slug($club->getName()).'-'.uniqid('', true).'.'.$logo->guessExtension();
                $storageClubs->write($fileName, $logo->getContent());
            } catch (FilesystemException $e) {
                throw new InvalidArgumentException($e->getMessage());
            }
            $club->setLogo($fileName);
            $entityManager->persist($club);
            $entityManager->flush();

            return $this->redirectToRoute('admin.clubs.show', ['slug' => $club->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/clubs/new.html.twig', [
            'club' => $club,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::SHOW, methods: [Method::GET])]
    public function show(Club $club): Response
    {
        return $this->render('admin/clubs/show.html.twig', [
            'club' => $club,
        ]);
    }

    #[Route('/{slug}/edit', name: Crud::EDIT, methods: [Method::GET, Method::POST])]
    public function edit(
        Request $request,
        Club $club,
        EntityManagerInterface $entityManager,
        FilesystemOperator $storageClubs
    ): Response {
        $form = $this->createForm(ClubType::class, $club);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            if ($logo = $form->get('logo')->getData()) {
                if (!$logo instanceof File) {
                    throw new InvalidArgumentException();
                }
                try {
                    $fileName = $club->getSlug().'-'.uniqid('', true).'.'.$logo->guessExtension();
                    $storageClubs->write($fileName, $logo->getContent());
                    $storageClubs->delete($club->getLogo());
                    $club->setLogo($fileName);
                } catch (FilesystemException $e) {
                    throw new InvalidArgumentException($e->getMessage());
                }
            }
            $entityManager->flush();

            return $this->redirectToRoute('admin.clubs.show', ['slug' => $club->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/clubs/edit.html.twig', [
            'club' => $club,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::DELETE, methods: [Method::POST])]
    public function delete(Request $request, Club $club, EntityManagerInterface $entityManager): Response
    {
        $token = $request->getPayload()->get('_token');
        if ($token && $this->isCsrfTokenValid('delete'.$club->getId(), (string) $token)) {
            $entityManager->remove($club);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin.clubs.list', [], Response::HTTP_SEE_OTHER);
    }
}
