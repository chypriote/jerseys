<?php

declare(strict_types=1);

namespace App\Core\Entity;

interface TimestampedEntityInterface
{
    public function getCreatedAt(): \DateTimeImmutable;

    public function getUpdatedAt(): \DateTimeImmutable;
}
