<?php

declare(strict_types=1);

namespace App\Entity;

use App\Core\Entity\SoftDeletableEntityInterface;
use App\Core\Entity\SoftDeletableEntityTrait;
use App\Enum\JerseyType;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Gedmo\Sluggable\Handler\RelativeSlugHandler;
use Gedmo\Sluggable\Handler\TreeSlugHandler;

#[ORM\Entity]
#[Gedmo\SoftDeleteable(fieldName: 'deletedAt')]
// #[Gedmo\Loggable]
class Jersey implements SoftDeletableEntityInterface
{
    use SoftDeletableEntityTrait;

    #[ORM\ManyToOne(targetEntity: Club::class, inversedBy: 'jerseys')]
    protected Club $club;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'jerseys')]
    protected Event $event;

    #[ORM\Column]
    #[Gedmo\Slug(fields: ['type'], separator: '-')]
    #[Gedmo\SlugHandler(class: TreeSlugHandler::class, options: [
        'parentRelationField' => 'club', 'relationSlugField' => 'name', 'separator' => '-', 'urilize' => true,
    ])]
    #[Gedmo\SlugHandler(class: RelativeSlugHandler::class, options: [
        'relationField' => 'event', 'relationSlugField' => 'name', 'separator' => '-', 'urilize' => true,
    ])]
    protected string $slug;

    #[ORM\Column]
    protected JerseyType $type;

    /** @var Collection<int, Offer> */
    #[ORM\OneToMany(mappedBy: 'jersey', targetEntity: Offer::class)]
    #[ORM\OrderBy(['price' => 'ASC'])]
    protected Collection $offers;

    #[ORM\Column]
    protected string $picture;

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

    public function getSlug(): string
    {
        return $this->slug;
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

    public function getEvent(): Event
    {
        return $this->event;
    }

    public function setEvent(Event $event): void
    {
        $this->event = $event;
    }

    public function getComputedName(): string
    {
        return sprintf(
            '%s %s Jersey %s',
            $this->getClub()->getName(),
            ucfirst($this->getType()->value),
            $this->getEvent()->getName()
        );
    }
}
