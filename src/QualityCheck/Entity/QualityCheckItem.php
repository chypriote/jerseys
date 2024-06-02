<?php

namespace App\QualityCheck\Entity;

use App\Entity\Jersey;
use Doctrine\ORM\Mapping as ORM;

class QualityCheckItem
{
    #[ORM\ManyToOne(targetEntity: QualityCheck::class, inversedBy: 'items')]
    protected QualityCheck $order;

    #[ORM\ManyToMany(targetEntity: Jersey::class)]
    protected ?Jersey $jersey = null;

    #[ORM\Column(nullable: true)]
    protected ?int $rating = null;

    #[ORM\Column(nullable: true)]
    protected ?string $comment = null;


}
