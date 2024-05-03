<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\TimestampedEntityInterface;
use App\Core\Entity\TimestampedEntityTrait;
use App\Enum\JerseyFormat;
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
    protected string $url;

    #[ORM\Column]
    protected string $price;

    #[ORM\Column]
    protected JerseyFormat $format;

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

    public function getUrl(): string
    {
        return $this->url;
    }

    public function setUrl(string $url): void
    {
        $this->url = $url;
    }

    public function getPrice(): string
    {
        return $this->price;
    }

    public function setPrice(string $price): void
    {
        $this->price = $price;
    }

    public function getFormat(): JerseyFormat
    {
        return $this->format;
    }

    public function setFormat(JerseyFormat $format): void
    {
        $this->format = $format;
    }
}
