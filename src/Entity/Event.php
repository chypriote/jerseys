<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\BaseEntityInterface;
use App\Core\Entity\BaseEntityTrait;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;

#[ORM\Entity]
class Event implements BaseEntityInterface
{
    use BaseEntityTrait;

    #[ORM\Column]
    protected string $name;

    #[ORM\Column]
    #[Gedmo\Slug(fields: ['name'])]
    protected string $slug;

    /** @var Collection<int, Jersey> */
    #[ORM\OneToMany(mappedBy: 'event', targetEntity: Jersey::class)]
    protected Collection $jerseys;

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

    public function getJerseys(): Collection
    {
        return $this->jerseys;
    }

    public function setJerseys(Collection $jerseys): void
    {
        $this->jerseys = $jerseys;
    }
}
