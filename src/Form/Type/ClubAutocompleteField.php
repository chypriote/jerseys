<?php

declare(strict_types=1);

namespace App\Form\Type;

use App\Entity\Club;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\Autocomplete\Form\AsEntityAutocompleteField;
use Symfony\UX\Autocomplete\Form\BaseEntityAutocompleteType;

#[AsEntityAutocompleteField]
class ClubAutocompleteField extends AbstractType
{
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'class' => Club::class,
            'placeholder' => 'What should we eat?',
            'searchable_fields' => ['name'],
            'choice_label' => static fn (Club $club) => "{$club->getName()}({$club->getSlug()})",
        ]);
    }

    public function getParent(): string
    {
        return BaseEntityAutocompleteType::class;
    }
}
