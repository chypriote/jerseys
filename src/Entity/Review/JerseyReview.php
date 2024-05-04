<?php

declare(strict_types=1);

namespace App\Entity\Review;

use App\Core\Entity\BaseEntityInterface;
use App\Core\Entity\BaseEntityTrait;
use App\Entity\Jersey;
use Doctrine\ORM\Mapping as ORM;

class JerseyReview implements BaseEntityInterface
{
    use BaseEntityTrait;

    #[ORM\ManyToOne(targetEntity: Review::class, inversedBy: 'jerseyReviews')]
    protected Review $review;

    #[ORM\Column]
    protected int $rating = 0;

    #[ORM\ManyToOne(targetEntity: Jersey::class)]
    #[ORM\JoinColumn(nullable: true)]
    protected ?Jersey $jersey = null;

    #[ORM\Column(nullable: true)]
    protected ?int $quality = null;

    #[ORM\Column(nullable: true)]
    protected ?int $sizing = null;

    #[ORM\Column(nullable: true)]
    protected ?int $customization = null;

    #[ORM\Column(nullable: true)]
    protected ?string $comment = null;

    /** @var string[] */
    #[ORM\Column(type: 'simple_array')]
    protected array $pictures = [];
}
