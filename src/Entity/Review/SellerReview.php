<?php

declare(strict_types=1);

namespace App\Entity\Review;

use App\Core\Entity\BaseEntityInterface;
use App\Core\Entity\BaseEntityTrait;
use App\Entity\Seller;
use Doctrine\ORM\Mapping as ORM;

class SellerReview implements BaseEntityInterface
{
    use BaseEntityTrait;

    #[ORM\ManyToOne(targetEntity: Seller::class)]
    protected Seller $seller;

    #[ORM\Column]
    protected int $rating = 0;

    #[ORM\Column(nullable: true)]
    protected ?string $comment = null;

    #[ORM\OneToOne(mappedBy: 'sellerReview', targetEntity: Review::class)]
    protected Review $review;

    #[ORM\Column(nullable: true)]
    protected ?int $customerService = null;

    #[ORM\Column(nullable: true)]
    protected ?int $timeToDelivery = null;
}
