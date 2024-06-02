<?php

namespace App\QualityCheck\Controller;

use App\Enum\Crud;
use App\QualityCheck\Entity\QualityCheck;
use App\QualityCheck\Form\QualityCheckType;
use Doctrine\ORM\EntityManagerInterface;
use Koriym\HttpConstants\Method;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/quality-check', name: 'quality_check')]
class CreateQualityCheck extends AbstractController
{
    #[Route(path: '/new', name: Crud::CREATE, methods: [Method::GET, Method::POST])]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager
    ): Response
    {
        $qc = new QualityCheck();
        $form = $this->createForm(QualityCheckType::class, $qc);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($qc);
            $entityManager->flush();

            return $this->redirectToRoute('quality_check.add_item', ['id' => $qc->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('create_qc.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route(path: '/{id}/add_item', name: 'add_item')]
    public function items(QualityCheck $qc): Response
    {
        dump($qc);die();
    }

}
