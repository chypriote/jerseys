<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Dto\CreateSellerDto;
use App\Entity\Seller;
use App\Form\Type\CreateSellerForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class CreateSellerAction extends AbstractController
{
    #[Route(path: '/sellers', name: 'create_seller_action')]
    public function __invoke(
        Request $request,
        EntityManagerInterface $entityManager,
    ): Response {
        $dto = new CreateSellerDto();
        $form = $this->createForm(CreateSellerForm::class, $dto)->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            /** @var CreateSellerDto $dto */
            $dto = $form->getData();
            $seller = Seller::fromDto($dto);
            $entityManager->persist($seller);
            $entityManager->flush();
        }
        $sellers = $entityManager->getRepository(Seller::class)->findAll();

        return $this->render('admin/sellers/create.html.twig', [
            'form' => $form->createView(),
            'sellers' => $sellers,
            'dto' => $seller ?? $dto,
        ]);
    }
}
