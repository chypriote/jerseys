<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Seller;
use App\Enum\Crud;
use App\Form\SellerType;
use Doctrine\ORM\EntityManagerInterface;
use Koriym\HttpConstants\Method;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/sellers', name: 'sellers.')]
class SellersController extends AbstractController
{
    #[Route('', name: Crud::LIST, methods: [Method::GET])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $sellers = $entityManager
            ->getRepository(Seller::class)
            ->findAll();

        return $this->render('admin/sellers/index.html.twig', [
            'sellers' => $sellers,
        ]);
    }

    #[Route('/new', name: Crud::CREATE, methods: [Method::GET, Method::POST])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $seller = new Seller();
        $form = $this->createForm(SellerType::class, $seller);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($seller);
            $entityManager->flush();

            return $this->redirectToRoute('admin.sellers.show', ['slug' => $seller->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/sellers/new.html.twig', [
            'seller' => $seller,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::SHOW, methods: [Method::GET])]
    public function show(Seller $seller): Response
    {
        return $this->render('admin/sellers/show.html.twig', [
            'seller' => $seller,
        ]);
    }

    #[Route('/{slug}/edit', name: Crud::EDIT, methods: [Method::GET, Method::POST])]
    public function edit(Request $request, Seller $seller, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(SellerType::class, $seller);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.sellers.show', ['slug' => $seller->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/sellers/edit.html.twig', [
            'seller' => $seller,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::DELETE, methods: [Method::POST])]
    public function delete(Request $request, Seller $seller, EntityManagerInterface $entityManager): Response
    {
        $token = $request->getPayload()->get('_token');
        if ($token && $this->isCsrfTokenValid('delete'.$seller->getId(), (string) $token)) {
            $entityManager->remove($seller);
            $entityManager->flush();
        }

        return $this->redirectToRoute('index', [], Response::HTTP_SEE_OTHER);
    }
}
