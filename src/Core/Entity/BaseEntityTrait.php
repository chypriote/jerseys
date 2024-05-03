<?php

declare(strict_types=1);

namespace App\Core\Entity;

use Doctrine\ORM\Mapping as ORM;

// use Symfony\Component\Serializer\Annotation as Serializer;

trait BaseEntityTrait
{
    #[ORM\Id]
    #[ORM\Column(type: 'integer', unique: true)]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    //    #[Serializer\Ignore]
    protected int $id;

    public function __toString()
    {
        return self::class.'#'.$this->id;
    }

    public function getId(): int
    {
        return $this->id;
    }
}
