<?php

declare(strict_types=1);

namespace App\Entity\Review;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Ulid;

class Review implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\Column(type: 'ulid', unique: true)]
    protected Ulid $ulid;

    #[ORM\Column]
    protected int $rating = 0;

    #[ORM\Column]
    protected ?string $comment = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    protected User $user;

    #[ORM\OneToOne(mappedBy: 'review', targetEntity: SellerReview::class)]
    protected SellerReview $sellerReview;

    /** @var Collection<JerseyReview> */
    #[ORM\OneToMany(mappedBy: 'review', targetEntity: JerseyReview::class)]
    protected Collection $jerseyReviews;

    public function __construct()
    {
        $this->ulid = new Ulid();
        $this->jerseyReviews = new ArrayCollection();
    }

    public function getUlid(): Ulid
    {
        return $this->ulid;
    }

    public function setUlid(Ulid $ulid): self
    {
        $this->ulid = $ulid;

        return $this;
    }

    public function getIdentifier(): string
    {
        return $this->ulid->toHex();
    }
}
