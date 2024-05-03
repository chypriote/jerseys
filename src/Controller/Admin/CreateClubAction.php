<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Dto\CreateClubDto;
use App\Entity\Club;
use App\Form\Type\CreateClubForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
final class CreateClubAction extends AbstractController
{
    #[Route(path: '/clubs', name: 'create_club_action')]
    public function __invoke(Request $request, EntityManagerInterface $entityManager): Response
    {
        $dto = new CreateClubDto();
        $form = $this->createForm(CreateClubForm::class, $dto)->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $dto = $form->getData();
            $club = Club::fromDto($dto);
            $entityManager->persist($club);
            $entityManager->flush();
        }
        $clubs = $entityManager->getRepository(Club::class)->findAll();

        return $this->render('admin/clubs/create.html.twig', [
            'form' => $form->createView(),
            'dto' => $club ?? $dto,
            'clubs' => $clubs,
        ]);
    }
}
