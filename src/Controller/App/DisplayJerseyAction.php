<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Jersey;
use App\Repository\JerseyRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class DisplayJerseyAction extends AbstractController
{
    #[Route('/{slug}', name: 'jersey')]
    public function __invoke(Jersey $jersey, EntityManagerInterface $entityManager, JerseyRepository $jerseyRepository): Response
    {
        $clubJerseys = array_filter(
            $jerseyRepository->findBy(['club' => $jersey->getClub()]),
            static fn (Jersey $j) => $j->getId() !== $jersey->getId(),
        );

        return $this->render('jersey.html.twig', [
            'jersey' => $jersey,
            'clubJerseys' => $clubJerseys,
        ]);
    }
}
