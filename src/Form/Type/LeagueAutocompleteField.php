<?php

declare(strict_types=1);

namespace App\Form\Type;

use App\Entity\League;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\Autocomplete\Form\AsEntityAutocompleteField;
use Symfony\UX\Autocomplete\Form\BaseEntityAutocompleteType;

#[AsEntityAutocompleteField]
class LeagueAutocompleteField extends AbstractType
{
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'class' => League::class,
            'placeholder' => 'League ?',
            'searchable_fields' => ['name'],
            'choice_label' => static fn (League $league) => "{$league->getName()}({$league->getSlug()})",
        ]);
    }

    public function getParent(): string
    {
        return BaseEntityAutocompleteType::class;
    }
}
