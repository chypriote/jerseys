<?php

declare(strict_types=1);

namespace App\Entity;

use App\Dto\SubCategoryDto;

interface CategorizableItem
{
    public function toSubCategory(): SubCategoryDto;
}
