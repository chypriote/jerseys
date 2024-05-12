<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Dto\SubCategoryDto;
use App\Entity\CategorizableItem;
use App\Entity\Jersey;
use App\Entity\League;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class DisplayLeagueAction extends AbstractController
{
    #[Route('/l/{leagueSlug}', name: 'league')]
    public function __invoke(EntityManagerInterface $entityManager, string $leagueSlug): Response
    {
        $league = $entityManager->getRepository(League::class)->findOneBy(['slug' => $leagueSlug]);

        if (!$league instanceof League) {
            throw new NotFoundHttpException();
        }

        $jerseys = $entityManager->getRepository(Jersey::class)->findBy(['club.league' => $league]);
        $subCategories = $league->getClubs()->map(static fn (CategorizableItem $item): SubCategoryDto => $item->toSubCategory());

        return $this->render('jerseys_list.html.twig', [
            'title' => $league->getName(),
            'league' => $league,
            'subCategories' => $subCategories,
            'jerseys' => $jerseys,
        ]);
    }
}
