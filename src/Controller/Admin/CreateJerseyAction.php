<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Dto\CreateJerseyDto;
use App\Entity\Club;
use App\Entity\Jersey;
use App\Form\Type\CreateJerseyForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class CreateJerseyAction extends AbstractController
{
    #[Route(path: '/jerseys', name: 'create_jersey_action')]
    public function __invoke(
        Request $request,
        EntityManagerInterface $entityManager,
        #[MapQueryParameter] ?Club $club = null
    ): Response {
        $dto = new CreateJerseyDto();
        if ($club) {
            $dto->club = $club;
        }
        $form = $this->createForm(CreateJerseyForm::class, $dto)->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            /** @var CreateJerseyDto $dto */
            $dto = $form->getData();
            $jersey = Jersey::fromDto($dto);
            $entityManager->persist($jersey);
            $entityManager->flush();
        }
        $jerseys = $entityManager->getRepository(Jersey::class)->findAll();

        return $this->render('admin/jerseys/create.html.twig', [
            'form' => $form->createView(),
            'jerseys' => $jerseys,
            'dto' => $jersey ?? $dto,
        ]);
    }
}
