<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Seller;
use App\Repository\ClubRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Attribute\Cache;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
final class AppController extends AbstractController
{
    #[Route(path: '/', name: 'home')]
    #[Cache]
    public function home(ClubRepository $clubRepository, EntityManagerInterface $entityManager): Response
    {
        $clubs = $clubRepository->findAllWithJersey();
        $sellers = $entityManager->getRepository(Seller::class)->findBy([], ['updatedAt' => 'DESC'], 10);

        return $this->render('home.html.twig', [
            'clubs' => $clubs,
            'sellers' => $sellers,
        ]);
    }
}
