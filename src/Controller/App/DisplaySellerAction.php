<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Entity\Offer;
use App\Entity\Seller;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class DisplaySellerAction extends AbstractController
{
    #[Route('/s/{sellerSlug}', name: 'seller')]
    public function __invoke(EntityManagerInterface $entityManager, string $sellerSlug): Response
    {
        $seller = $entityManager->getRepository(Seller::class)->findOneBy(['slug' => $sellerSlug]);

        if (!$seller instanceof Seller) {
            throw $this->createNotFoundException();
        }

        $offers = $entityManager->getRepository(Offer::class)->findBy(['seller' => $seller]);

        return $this->render('offers_list.html.twig', [
            'title' => $seller->getName(),
            'subCategories' => [],
            'seller' => $seller,
            'offers' => $offers,
        ]);
    }
}
