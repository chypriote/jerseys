<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Enum\JerseyFormat;
use App\Enum\PaymentMethod;
use App\Repository\SellerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SellerRepository::class)]
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
    #[ORM\OneToMany(mappedBy: 'seller', targetEntity: Offer::class, fetch: 'EAGER')]
    protected Collection $offers;

    #[ORM\Column]
    protected ?string $logo = null;

    #[ORM\Column(nullable: true)]
    protected ?string $whatsapp = null;

    /** @var PaymentMethod[] */
    #[ORM\Column(type: 'simple_array', nullable: true, enumType: PaymentMethod::class)]
    protected array $paymentMethods = [];

    #[ORM\Column(nullable: true)]
    protected string $defaultPriceFan;
    #[ORM\Column(nullable: true)]
    protected string $defaultPricePlayer;
    #[ORM\Column(nullable: true)]
    protected string $defaultPriceKid;
    #[ORM\Column(nullable: true)]
    protected string $defaultPriceWoman;

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

    public function getDefaultPriceFan(): string
    {
        return $this->defaultPriceFan;
    }

    public function setDefaultPriceFan(string $defaultPriceFan): void
    {
        $this->defaultPriceFan = $defaultPriceFan;
    }

    public function getDefaultPricePlayer(): string
    {
        return $this->defaultPricePlayer;
    }

    public function setDefaultPricePlayer(string $defaultPricePlayer): void
    {
        $this->defaultPricePlayer = $defaultPricePlayer;
    }

    public function getDefaultPriceKid(): string
    {
        return $this->defaultPriceKid;
    }

    public function setDefaultPriceKid(string $defaultPriceKid): void
    {
        $this->defaultPriceKid = $defaultPriceKid;
    }

    public function getDefaultPriceWoman(): string
    {
        return $this->defaultPriceWoman;
    }

    public function setDefaultPriceWoman(string $defaultPriceWoman): void
    {
        $this->defaultPriceWoman = $defaultPriceWoman;
    }

    public function getDefaultPriceByFormat(JerseyFormat $format): string
    {
        return match ($format) {
            JerseyFormat::FAN => $this->getDefaultPriceFan(),
            JerseyFormat::PLAYER => $this->getDefaultPricePlayer(),
            JerseyFormat::KID => $this->getDefaultPriceKid(),
            JerseyFormat::WOMAN => $this->getDefaultPriceWoman(),
        };
    }
}
