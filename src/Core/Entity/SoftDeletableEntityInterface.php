<?php

declare(strict_types=1);

namespace App\Core\Entity;

interface SoftDeletableEntityInterface extends TimestampedEntityInterface
{
    public function getDeletedAt(): ?\DateTimeImmutable;
}
