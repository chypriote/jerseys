<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Dto\CreateClubDto;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\Validator\Constraints as Assert;

// use App\ThirdParty\Cloudinary\UploadedFile;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
// #[Gedmo\Loggable]
class Club implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\Column]
    #[Assert\NotBlank]
    protected string $name;

    #[ORM\Column(unique: true)]
    #[Gedmo\Slug(fields: ['name'])]
    protected string $slug;

    #[ORM\Column]
    #[Assert\NotBlank]
    protected string $country;

    /** @var ArrayCollection<int, Jersey> */
    #[ORM\OneToMany(targetEntity: Jersey::class, mappedBy: 'club')]
    protected Collection $jerseys;

    #[ORM\ManyToOne(targetEntity: League::class, inversedBy: 'clubs')]
    protected League $league;

    #[Assert\Image]
    #[ORM\Column]
    //    #[ORM\OneToOne(targetEntity: UploadedFile::class)]
    //    #[ORM\JoinColumn(nullable: true)]
    protected ?string $logo = null;

    public function __construct()
    {
        $this->jerseys = new ArrayCollection();
    }

    public static function fromDto(CreateClubDto $dto): self
    {
        $club = new self();
        $club->setName($dto->name);
        $club->setLogo($dto->logo);
        $club->setCountry($dto->country);

        return $club;
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

    public function getCountry(): string
    {
        return $this->country;
    }

    public function setCountry(string $country): void
    {
        $this->country = $country;
    }

    public function getLeague(): League
    {
        return $this->league;
    }

    public function setLeague(League $league): void
    {
        $this->league = $league;
    }

    public function getJerseys(): Collection
    {
        return $this->jerseys;
    }

    public function setJerseys(Collection $jerseys): void
    {
        $this->jerseys = $jerseys;
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
