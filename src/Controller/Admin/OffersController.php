<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Offer;
use App\Enum\Crud;
use App\Form\OfferFromJerseyType;
use App\Form\OfferType;
use Doctrine\ORM\EntityManagerInterface;
use Koriym\HttpConstants\Method;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/offers', name: 'offers.')]
class OffersController extends AbstractController
{
    #[Route('/new', name: Crud::CREATE, methods: [Method::POST])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $offer = new Offer();
        $form = $this->createForm(OfferFromJerseyType::class, $offer);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($offer);
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug()], Response::HTTP_SEE_OTHER);
        }

        throw $this->createNotFoundException();
    }

    #[Route('/{id}/edit', name: Crud::EDIT, methods: [Method::POST])]
    public function edit(Request $request, Offer $offer, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(OfferType::class, $offer);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug()], Response::HTTP_SEE_OTHER);
        }

        throw $this->createNotFoundException();
    }

    #[Route('/{id}', name: Crud::DELETE, methods: [Method::POST])]
    public function delete(Request $request, Offer $offer, EntityManagerInterface $entityManager): Response
    {
        $token = $request->getPayload()->get('_token');
        if ($token && $this->isCsrfTokenValid('delete'.$offer->getId(), (string) $token)) {
            $entityManager->remove($offer);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug()], Response::HTTP_SEE_OTHER);
    }
}
