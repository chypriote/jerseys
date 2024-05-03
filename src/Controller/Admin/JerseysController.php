<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Jersey;
use App\Form\JerseyType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/jerseys', name: 'jerseys.')]
class JerseysController extends AbstractController
{
    #[Route('/', name: 'list', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $jerseys = $entityManager
            ->getRepository(Jersey::class)
            ->findAll();

        return $this->render('admin/jerseys/index.html.twig', [
            'jerseys' => $jerseys,
        ]);
    }

    #[Route('/new', name: 'create', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $jersey = new Jersey();
        $form = $this->createForm(JerseyType::class, $jersey);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($jersey);
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['id' => $jersey->getId()]);
        }

        return $this->render('admin/jerseys/new.html.twig', [
            'jersey' => $jersey,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(Jersey $jersey): Response
    {
        return $this->render('admin/jerseys/show.html.twig', [
            'jersey' => $jersey,
        ]);
    }

    #[Route('/{id}/edit', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Jersey $jersey, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(JerseyType::class, $jersey);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['id' => $jersey->getId()]);
        }

        return $this->render('admin/jerseys/edit.html.twig', [
            'jersey' => $jersey,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['POST'])]
    public function delete(Request $request, Jersey $jersey, EntityManagerInterface $entityManager): Response
    {
        $token = $request->getPayload()->get('_token');
        if ($token && $this->isCsrfTokenValid('delete'.$jersey->getId(), (string) $token)) {
            $entityManager->remove($jersey);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin.jerseys.list', [], Response::HTTP_SEE_OTHER);
    }
}
