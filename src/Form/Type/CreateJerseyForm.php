<?php

declare(strict_types=1);

namespace App\Form\Type;

use App\Enum\JerseyType;
use App\Enum\JerseyYears;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;

class CreateJerseyForm extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('club', ClubAutocompleteField::class)
            ->add('type', EnumType::class, ['class' => JerseyType::class])
            ->add('year', EnumType::class, ['class' => JerseyYears::class])
            ->add('picture', TextType::class)
            ->add('save', SubmitType::class, ['attr' => ['primary' => '']]);
    }
}
