<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\TimestampedEntityInterface;
use App\Core\Entity\TimestampedEntityTrait;
use App\Enum\JerseyFormat;
use App\Enum\JerseySizes;
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

    /** @var JerseySizes[] */
    #[ORM\Column(type: 'simple_array', nullable: true, enumType: JerseySizes::class)]
    protected array $sizes = [
        JerseySizes::SIZE_S,
        JerseySizes::SIZE_M,
        JerseySizes::SIZE_L,
        JerseySizes::SIZE_XL,
    ];

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    protected bool $customizable = true;

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

    /** @return  JerseySizes[] */
    public function getSizes(): array
    {
        return $this->sizes;
    }

    /** @param  JerseySizes[] $sizes */
    public function setSizes(array $sizes): void
    {
        $this->sizes = $sizes;
    }

    public function isCustomizable(): bool
    {
        return $this->customizable;
    }

    public function setCustomizable(bool $customizable): void
    {
        $this->customizable = $customizable;
    }
}
