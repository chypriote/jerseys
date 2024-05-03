<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\TimestampedEntityInterface;
use App\Core\Entity\TimestampedEntityTrait;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Offer implements TimestampedEntityInterface
{
    use TimestampedEntityTrait;
    #[ORM\ManyToOne(targetEntity: Seller::class, inversedBy: 'offers')]
    protected Seller $seller;

    #[ORM\ManyToOne(targetEntity: Jersey::class, inversedBy: 'offers')]
    protected Jersey $jersey;

    #[ORM\Column]
    protected string $link;

    #[ORM\Column]
    protected int $price;

    public function getSeller(): Seller
    {
        return $this->seller;
    }

    public function setSeller(Seller $seller): void
    {
        $this->seller = $seller;
    }

    public function getJersey(): Jersey
    {
        return $this->jersey;
    }

    public function setJersey(Jersey $jersey): void
    {
        $this->jersey = $jersey;
    }

    public function getLink(): string
    {
        return $this->link;
    }

    public function setLink(string $link): void
    {
        $this->link = $link;
    }

    public function getPrice(): int
    {
        return $this->price;
    }

    public function setPrice(int $price): void
    {
        $this->price = $price;
    }
}
