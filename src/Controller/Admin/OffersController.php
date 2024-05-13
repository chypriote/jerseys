<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Jersey;
use App\Entity\Offer;
use App\Entity\Seller;
use App\Enum\Crud;
use App\Enum\JerseyFormat;
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
    #[Route('/{id}/edit', name: Crud::EDIT, methods: [Method::POST, Method::GET])]
    public function edit(Request $request, Offer $offer, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(OfferType::class, $offer);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/offers/edit.html.twig', [
            'offer' => $offer,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/default', name: 'create_default', methods: [Method::POST])]
    public function fromJerseyAndSeller(
        EntityManagerInterface $entityManager,
        Request $request,
    ): Response {
        $offer = new Offer();
        $seller = $entityManager->getRepository(Seller::class)->find($request->get('seller'));
        if (!$seller instanceof Seller) {
            $this->addFlash('error', 'Invalid seller');

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug(), '_fragment' => 'offers'], Response::HTTP_SEE_OTHER);
        }
        $jersey = $entityManager->getRepository(Jersey::class)->find($request->get('jersey'));
        if (!$jersey instanceof Jersey) {
            $this->addFlash('error', 'Invalid seller');

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug(), '_fragment' => 'offers'], Response::HTTP_SEE_OTHER);
        }

        $offer->setSeller($seller);
        $offer->setJersey($jersey);
        $format = JerseyFormat::from((string) $request->get('format'));
        $offer->setFormat($format);
        $offer->setPrice($request->get('price') ?? $seller->getDefaultPriceByFormat($format));

        $entityManager->persist($offer);
        $entityManager->flush();

        return $this->redirectToRoute('admin.jerseys.show', ['slug' => $offer->getJersey()->getSlug(), '_fragment' => 'offers'], Response::HTTP_SEE_OTHER);
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
