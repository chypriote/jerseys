<?php

declare(strict_types=1);

namespace App\Form;

use App\Entity\Jersey;
use App\Enum\JerseyYears;
use App\Form\Type\ClubAutocompleteField;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class JerseyType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('type', EnumType::class, ['class' => \App\Enum\JerseyType::class])
            ->add('year', EnumType::class, ['class' => JerseyYears::class])
            ->add('picture', TextType::class)
            ->add('club', ClubAutocompleteField::class);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Jersey::class,
        ]);
    }
}
