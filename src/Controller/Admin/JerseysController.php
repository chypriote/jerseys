<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Event;
use App\Entity\Jersey;
use App\Entity\Offer;
use App\Enum\Crud;
use App\Enum\JerseyFormat;
use App\Form\JerseyType;
use App\Form\OfferFromJerseyType;
use App\Repository\SellerRepository;
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

#[Route('/jerseys', name: 'jerseys.')]
class JerseysController extends AbstractController
{
    #[Route('', name: Crud::LIST, methods: [Method::GET])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $jerseys = $entityManager
            ->getRepository(Jersey::class)
            ->findAll();

        return $this->render('admin/jerseys/index.html.twig', [
            'jerseys' => $jerseys,
        ]);
    }

    #[Route('/new', name: Crud::CREATE, methods: [Method::GET, Method::POST])]
    public function new(
        Request $request,
        EntityManagerInterface $entityManager,
        FilesystemOperator $storageJerseys,
        SluggerInterface $slugger
    ): Response {
        $jersey = new Jersey();
        $jersey->setEvent($entityManager->getRepository(Event::class)->find(4));
        $form = $this->createForm(JerseyType::class, $jersey);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $picture = $form->get('picture')->getData();
            if (!$picture instanceof File) {
                throw new InvalidArgumentException();
            }
            try {
                $fileName = $slugger->slug($jersey->getClub()->getName().'-'.$jersey->getEvent()->getName())->lower().'-'.uniqid('', true).'.'.$picture->guessExtension();
                $storageJerseys->write($fileName, $picture->getContent());
            } catch (FilesystemException $e) {
                throw new InvalidArgumentException($e->getMessage());
            }
            $jersey->setPicture($fileName);
            $entityManager->persist($jersey);
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $jersey->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/jerseys/new.html.twig', [
            'jersey' => $jersey,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}', name: Crud::SHOW, methods: [Method::GET])]
    public function show(Jersey $jersey, SellerRepository $sellerRepository): Response
    {
        $offer = new Offer();
        $offer->setJersey($jersey);

        $form = $this->createForm(OfferFromJerseyType::class, $offer, ['jersey' => $jersey->getSlug()]);

        $sellers = $sellerRepository->findAllWithOffers($jersey);

        $formattedOffers = [];
        $jerseyId = $jersey->getId();
        foreach ($sellers as $seller) {
            $id = $seller->getId();
            $formattedOffers[$id] = [];
            foreach (JerseyFormat::cases() as $format) {
                $formattedOffers[$id][$format->value] = $seller->getOffers()->findFirst(fn ($key, Offer $offer) => $offer->getJersey()->getId() === $jerseyId && $offer->getFormat() === $format);
            }
        }

        return $this->render('admin/jerseys/show.html.twig', [
            'jersey' => $jersey,
            'sellers' => $sellers,
            'sellersOffers' => $formattedOffers,
            'jerseyFormats' => JerseyFormat::cases(),
            'offerForm' => $form->createView(),
        ]);
    }

    #[Route('/{slug}/edit', name: Crud::EDIT, methods: [Method::GET, Method::POST])]
    public function edit(Request $request,
        Jersey $jersey,
        EntityManagerInterface $entityManager,
        FilesystemOperator $storageJerseys
    ): Response {
        $form = $this->createForm(JerseyType::class, $jersey);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            if ($picture = $form->get('picture')->getData()) {
                if (!$picture instanceof File) {
                    throw new InvalidArgumentException();
                }
                try {
                    $fileName = $jersey->getSlug().'-'.uniqid('', true).'.'.$picture->guessExtension();
                    $storageJerseys->write($fileName, $picture->getContent());
                    $storageJerseys->delete($jersey->getPicture());
                    $jersey->setPicture($fileName);
                } catch (FilesystemException $e) {
                    throw new InvalidArgumentException($e->getMessage());
                }
            }
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $jersey->getSlug()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/jerseys/edit.html.twig', [
            'jersey' => $jersey,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{slug}/offer', name: 'create_offer', methods: [Method::POST])]
    public function createOffer(Request $request, Jersey $jersey, EntityManagerInterface $entityManager): Response
    {
        $offer = new Offer();
        $form = $this->createForm(OfferFromJerseyType::class, $offer, ['jersey' => $jersey->getSlug()]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($offer);
            $entityManager->flush();

            return $this->redirectToRoute('admin.jerseys.show', ['slug' => $jersey->getSlug()], Response::HTTP_SEE_OTHER);
        }

        throw $this->createNotFoundException();
    }

    #[Route('/{slug}', name: Crud::DELETE, methods: [Method::POST])]
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
