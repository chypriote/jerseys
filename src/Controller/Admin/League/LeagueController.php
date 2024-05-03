<?php

declare(strict_types=1);

namespace App\Controller\Admin\League;

use App\Entity\League;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/leagues', name: 'leagues.')]
class LeagueController extends AbstractController
{
    #[Route('/', name: 'list', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $leagues = $entityManager
            ->getRepository(League::class)
            ->findAll();

        return $this->render('admin/leagues/index.html.twig', [
            'leagues' => $leagues,
        ]);
    }

    #[Route('/{slug}', name: 'show', methods: ['GET'])]
    public function show(League $league): Response
    {
        return $this->render('admin/leagues/show.html.twig', [
            'league' => $league,
        ]);
    }

    #[Route('/{slug}', name: 'delete', methods: ['POST'])]
    public function delete(Request $request, League $league, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete'.$league->getId(), $request->getPayload()->get('_token'))) {
            $entityManager->remove($league);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin.leagues.list', [], Response::HTTP_SEE_OTHER);
    }
}
