<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Club;
use App\Entity\Seller;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Attribute\Cache;
use Symfony\Component\Routing\Attribute\Route;

/**
 * @see AppControllerTest
 */
#[AsController]
final class AppController extends AbstractController
{
    /**
     * Simple page with some dynamic content.
     */
    #[Route(path: '/', name: 'home')]
    #[Cache]
    public function home(EntityManagerInterface $entityManager): Response
    {
        $clubs = $entityManager->getRepository(Club::class)->findBy([], ['updatedAt' => 'DESC'], 10);
        $sellers = $entityManager->getRepository(Seller::class)->findBy([], ['updatedAt' => 'DESC'], 10);

        return $this->render('home.html.twig', [
            'clubs' => $clubs,
            'sellers' => $sellers,
        ]);
    }
}
