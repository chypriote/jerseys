<?php

declare(strict_types=1);

namespace App\Core\Entity;

use Doctrine\ORM\Mapping as ORM;

trait SoftDeletableEntityTrait
{
    use TimestampedEntityTrait;

    #[ORM\Column(name: 'deleted_at', type: 'datetime_immutable', nullable: true)]
    protected ?\DateTimeImmutable $deletedAt = null;

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }
}
