<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Dto\CreateLeagueDto;
use App\Entity\League;
use App\Form\Type\CreateLeagueForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class CreateLeagueAction extends AbstractController
{
    #[Route(path: '/leagues', name: 'create_league_action')]
    public function __invoke(
        Request $request,
        EntityManagerInterface $entityManager,
    ): Response
    {
        $dto = new CreateLeagueDto();
        $form = $this->createForm(CreateLeagueForm::class, $dto)->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            /** @var CreateLeagueDto $dto */
            $dto = $form->getData();
            $league = League::fromDto($dto);
            $entityManager->persist($league);
            $entityManager->flush();
        }
        $leagues = $entityManager->getRepository(League::class)->findAll();

        return $this->render('admin/leagues/create.html.twig', [
            'form' => $form->createView(),
            'leagues' => $leagues,
            'dto' => $league ?? $dto,
        ]);
    }
}
