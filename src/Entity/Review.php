<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Ulid;

class Review implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\Column(type: 'ulid', unique: true)]
    protected string $ulid;

    #[ORM\ManyToOne(targetEntity: Seller::class)]
    protected Seller $seller;

    #[ORM\Column]
    protected int $rating = 0;

    #[ORM\Column]
    protected ?string $comment = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    protected User $user;

    public function __construct()
    {
        $this->ulid = new Ulid();
    }

    public function getUlid(): ?string
    {
        return $this->ulid;
    }

    public function setUlid(string $ulid): self
    {
        $this->ulid = $ulid;

        return $this;
    }

    public function getIdentifier(): string
    {
        return $this->ulid;
    }
}
