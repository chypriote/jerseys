<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Enum\PaymentMethod;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
// #[Gedmo\Loggable]
class Seller implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\Column]
    #[Assert\NotBlank]
    protected string $name;

    #[ORM\Column]
    #[Gedmo\Slug(fields: ['name'])]
    protected string $slug;

    #[ORM\Column]
    protected string $url;

    /** @var ArrayCollection<int, Offer> */
    #[ORM\OneToMany(mappedBy: 'seller', targetEntity: Offer::class)]
    protected Collection $offers;

    #[ORM\Column]
    protected ?string $logo = null;

    #[ORM\Column(nullable: true)]
    protected ?string $whatsapp = null;

    /** @var PaymentMethod[] */
    #[ORM\Column(type: 'simple_array', nullable: true, enumType: PaymentMethod::class)]
    protected array $paymentMethods = [];

    public function __construct()
    {
        $this->offers = new ArrayCollection();
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        $this->name = $name;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): void
    {
        $this->slug = $slug;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function setUrl(string $url): void
    {
        $this->url = $url;
    }

    /** @return  ArrayCollection<int, Offer> $offers */
    public function getOffers(): Collection
    {
        return $this->offers;
    }

    /** @param ArrayCollection<int, Offer> $offers */
    public function setOffers(Collection $offers): void
    {
        $this->offers = $offers;
    }

    public function getLogo(): ?string
    {
        return $this->logo;
    }

    public function setLogo(?string $logo): void
    {
        $this->logo = $logo;
    }

    public function getWhatsapp(): ?string
    {
        return $this->whatsapp;
    }

    public function setWhatsapp(?string $whatsapp): void
    {
        $this->whatsapp = $whatsapp;
    }

    /** @return PaymentMethod[] */
    public function getPaymentMethods(): array
    {
        return $this->paymentMethods;
    }

    /** @param PaymentMethod[] */
    public function setPaymentMethods(array $paymentMethods): void
    {
        $this->paymentMethods = $paymentMethods;
    }
}
