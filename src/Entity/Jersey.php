<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Enum\JerseyType;
use App\Enum\JerseyYears;
use App\Enum\PaymentMethod;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Gedmo\Sluggable\Handler\RelativeSlugHandler;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
// #[Gedmo\Loggable]
class Jersey implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\ManyToOne(targetEntity: Club::class, inversedBy: 'jerseys')]
    protected Club $club;

    #[ORM\Column]
    protected JerseyYears $year;

    #[ORM\Column]
    #[Gedmo\Slug(fields: ['year'])]
    #[Gedmo\SlugHandler(class: RelativeSlugHandler::class, options: [
        'relationField' => 'club', 'relationSlugField' => 'name', 'separator' => '-',
        'urilize' => true,
    ])]
    protected string $slug;

    #[ORM\Column]
    protected JerseyType $type;

    /** @var ArrayCollection<int, Offer> */
    #[ORM\OneToMany(mappedBy: 'jersey', targetEntity: Offer::class)]
    protected Collection $offers;

    #[ORM\Column]
    protected string $picture;

    #[ORM\Column(nullable: true)]
    protected ?string $whatsapp = null;

    #[ORM\Column(nullable: true)]
    protected ?string $email = null;

    /** @var PaymentMethod[] */
    #[ORM\Column(type: 'simple_array', nullable: true)]
    protected array $paymentMethods = [];

    public function __construct()
    {
        $this->offers = new ArrayCollection();
    }

    public function getClub(): Club
    {
        return $this->club;
    }

    public function setClub(Club $club): void
    {
        $this->club = $club;
    }

    public function getYear(): JerseyYears
    {
        return $this->year;
    }

    public function setYear(JerseyYears $year): void
    {
        $this->year = $year;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): void
    {
        $this->slug = $slug;
    }

    public function getType(): JerseyType
    {
        return $this->type;
    }

    public function setType(JerseyType $type): void
    {
        $this->type = $type;
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

    public function getPicture(): string
    {
        return $this->picture;
    }

    public function setPicture(string $picture): void
    {
        $this->picture = $picture;
    }

    public function getWhatsapp(): ?string
    {
        return $this->whatsapp;
    }

    public function setWhatsapp(?string $whatsapp): void
    {
        $this->whatsapp = $whatsapp;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): void
    {
        $this->email = $email;
    }

    public function getComputedName(): string
    {
        return sprintf('%s %s Jersey %s', $this->getClub()->getName(), $this->getType()->value, $this->getYear()->value);
    }
}
