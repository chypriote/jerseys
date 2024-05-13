<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Club;
use App\Repository\JerseyRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class DisplayClubAction extends AbstractController
{
    #[Route('/c/{slug}', name: 'club')]
    public function __invoke(Club $club, JerseyRepository $jerseyRepository): Response
    {
        $jerseys = $jerseyRepository->findByClub($club);

        return $this->render('jerseys_list.html.twig', [
            'title' => $club->getName(),
            'subCategories' => [],
            'club' => $club,
            'jerseys' => $jerseys,
        ]);
    }
}
