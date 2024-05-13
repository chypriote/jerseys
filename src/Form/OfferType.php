<?php

declare(strict_types=1);

namespace App\Form;

use App\Entity\Offer;
use App\Enum\JerseyFormat;
use App\Enum\JerseySizes;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class OfferType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('url', TextType::class, [
                'required' => false,
                'empty_data' => '',
            ])
            ->add('price')
            ->add('sizes', EnumType::class, [
                'class' => JerseySizes::class,
                'multiple' => true,
                'expanded' => true,
            ])
            ->add('format', EnumType::class, [
                'class' => JerseyFormat::class,
                'multiple' => false,
                'expanded' => true,
            ])
            ->add('customizable', CheckboxType::class, [
                'required' => false,
            ])
            ->add('save', SubmitType::class, [
                'label' => 'Save',
                'attr' => ['primary' => true],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Offer::class,
        ]);
    }
}
