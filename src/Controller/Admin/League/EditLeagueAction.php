<?php

declare(strict_types=1);

namespace App\Controller\Admin\League;

use App\Entity\League;
use App\Form\Type\CreateLeagueForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class EditLeagueAction extends AbstractController
{
    #[Route(path: '/leagues/{slug}', name: 'edit_league_action')]
    public function __invoke(
        League $league,
        Request $request,
        EntityManagerInterface $entityManager,
    ): Response
    {
        $form = $this->createForm(CreateLeagueForm::class, $league);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin.create_league_action', [], Response::HTTP_SEE_OTHER);
        }

        $leagues = $entityManager->getRepository(League::class)->findAll();

        return $this->render('admin/leagues/edit.html.twig', [
            'league' => $league,
            'leagues' => $leagues,
            'form' => $form->createView(),
        ]);
    }
}
