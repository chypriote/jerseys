<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
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
    #[ORM\OneToMany(targetEntity: Offer::class, mappedBy: 'seller')]
    protected Collection $offers;

    #[Assert\Image]
    #[ORM\Column]
    protected ?string $logo = null;

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
}
