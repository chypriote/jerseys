<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Seller;
use App\Form\SellerType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/sellers', name: 'sellers.')]
class SellersController extends AbstractController
{
    #[Route('/', name: 'list', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $sellers = $entityManager
            ->getRepository(Seller::class)
            ->findAll();

        return $this->render('admin/sellers/index.html.twig', [
            'sellers' => $sellers,
        ]);
    }

    #[Route('/new', name: 'new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $seller = new Seller();
        $form = $this->createForm(SellerType::class, $seller);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($seller);
            $entityManager->flush();

            return $this->redirectToRoute('admin.sellers.show', ['slug' => $seller->getSlug()]);
        }

        return $this->render('admin/sellers/new.html.twig', [
            'seller' => $seller,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: 'show', methods: ['GET'])]
    public function show(Seller $seller): Response
    {
        return $this->render('admin/sellers/show.html.twig', [
            'seller' => $seller,
        ]);
    }

    #[Route('/{slug}/edit', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Seller $seller, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(SellerType::class, $seller);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.sellers.show', ['slug' => $seller->getSlug()]);
        }

        return $this->render('admin/sellers/edit.html.twig', [
            'seller' => $seller,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: 'delete', methods: ['POST'])]
    public function delete(Request $request, Seller $seller, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete'.$seller->getId(), $request->getPayload()->get('_token'))) {
            $entityManager->remove($seller);
            $entityManager->flush();
        }

        return $this->redirectToRoute('index', [], Response::HTTP_SEE_OTHER);
    }
}
