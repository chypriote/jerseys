<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Dto\CreateLeagueDto;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
class League implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\Column]
    #[Assert\NotBlank]
    protected string $name;

    #[ORM\Column]
    #[Gedmo\Slug(fields: ['name'])]
    protected string $slug;

    /** @var ArrayCollection<int, Club> */
    #[ORM\OneToMany(targetEntity: Club::class, mappedBy: 'league')]
    protected Collection $clubs;

    #[Assert\Image]
    #[ORM\Column]
    protected ?string $logo = null;

    public function __construct()
    {
        $this->clubs = new ArrayCollection();
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

    /** @return  ArrayCollection<int, Club> $clubs */
    public function getClubs(): Collection
    {
        return $this->clubs;
    }

    /** @param ArrayCollection<int, Club> $clubs */
    public function setClubs(Collection $clubs): void
    {
        $this->clubs = $clubs;
    }

    public function getLogo(): ?string
    {
        return $this->logo;
    }

    public function setLogo(?string $logo): void
    {
        $this->logo = $logo;
    }

    public static function fromDto(CreateLeagueDto $dto): self
    {
        $league = new self();
        $league->setName($dto->name);
        $league->setLogo($dto->logo);

        return $league;
    }
}
