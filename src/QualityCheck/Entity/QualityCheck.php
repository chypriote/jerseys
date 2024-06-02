<?php

namespace App\QualityCheck\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Entity\Seller;
use App\Entity\User;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
class QualityCheck implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\ManyToOne(targetEntity: Seller::class)]
    protected Seller $seller;

    #[ORM\ManyToOne(targetEntity: User::class)]
    protected User $user;

    #[ORM\Column]
    protected \DateTimeImmutable $orderedAt;

    #[ORM\Column(nullable: true)]
    protected ?\DateTimeImmutable $shippedAt = null;

    #[ORM\Column(nullable: true)]
    protected ?\DateTimeImmutable $deliveredAt = null;

    #[ORM\Column]
    protected int $rating;

    #[ORM\Column(nullable: true)]
    protected ?string $comment = null;

    /** @var Collection<int, QualityCheckItem> */
    #[ORM\OneToMany(mappedBy: 'order', targetEntity: QualityCheckItem::class)]
    protected Collection $items;

    public function getSeller(): Seller
    {
        return $this->seller;
    }

    public function setSeller(Seller $seller): void
    {
        $this->seller = $seller;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): void
    {
        $this->user = $user;
    }

    public function getOrderedAt(): \DateTimeImmutable
    {
        return $this->orderedAt;
    }

    public function setOrderedAt(\DateTimeImmutable $orderedAt): void
    {
        $this->orderedAt = $orderedAt;
    }

    public function getShippedAt(): ?\DateTimeImmutable
    {
        return $this->shippedAt;
    }

    public function setShippedAt(?\DateTimeImmutable $shippedAt): void
    {
        $this->shippedAt = $shippedAt;
    }

    public function getDeliveredAt(): ?\DateTimeImmutable
    {
        return $this->deliveredAt;
    }

    public function setDeliveredAt(?\DateTimeImmutable $deliveredAt): void
    {
        $this->deliveredAt = $deliveredAt;
    }

    public function getRating(): int
    {
        return $this->rating;
    }

    public function setRating(int $rating): void
    {
        $this->rating = $rating;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(?string $comment): void
    {
        $this->comment = $comment;
    }

    public function getItems(): Collection
    {
        return $this->items;
    }

    public function setItems(Collection $items): void
    {
        $this->items = $items;
    }
}
