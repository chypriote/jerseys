<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Club;
use App\Entity\Jersey;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class DisplayClubAction extends AbstractController
{
    #[Route('/c/{clubSlug}', name: 'club')]
    public function __invoke(EntityManagerInterface $entityManager, string $clubSlug): Response
    {
        $club = $entityManager->getRepository(Club::class)->findOneBy(['slug' => $clubSlug]);

        if (!$club instanceof Club) {
            throw $this->createNotFoundException();
        }

        $jerseys = $entityManager->getRepository(Jersey::class)->findBy(['club' => $club]);

        return $this->render('jerseys_list.html.twig', [
            'title' => $club->getName(),
            'subCategories' => [],
            'club' => $club,
            'jerseys' => $jerseys,
        ]);
    }
}
