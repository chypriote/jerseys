<?php

declare(strict_types=1);

namespace App\Controller\Admin\League;

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
    #[Route(path: '/leagues/new', name: 'leagues.create', methods: ['GET', 'POST'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $entityManager,
    ): Response {
        $dto = new CreateLeagueDto();
        $form = $this->createForm(CreateLeagueForm::class, $dto)->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            /** @var CreateLeagueDto $dto */
            $dto = $form->getData();
            $league = League::fromDto($dto);
            $entityManager->persist($league);
            $entityManager->flush();

            return $this->redirectToRoute('admin.leagues.show', ['slug' => $league->getSlug()]);
        }

        return $this->render('admin/leagues/new.html.twig', [
            'form' => $form->createView(),
            'dto' => $league ?? $dto,
        ]);
    }
}
