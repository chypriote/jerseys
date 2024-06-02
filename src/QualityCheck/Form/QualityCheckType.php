<?php

namespace App\QualityCheck\Form;

use App\Entity\Seller;
use App\Form\Type\SellerAutocompleteField;
use App\QualityCheck\Entity\QualityCheck;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\RangeType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Date;

class QualityCheckType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('seller', SellerAutocompleteField::class)
            ->add('orderedAt', DateType::class, [
                'input_format' => 'dd-MM-yyyy',
                'constraints' => [
                    new Date(),
//                    new GreaterThan('today'),
                ]
            ])
            ->add('shippedAt', DateType::class, [
                'input_format' => 'dd-MM-yyyy',
                'required' => false,
                'constraints' => [
                    new Date(),
//                    new GreaterThan(['property_path' => 'orderedAt'])
                ],
            ])
            ->add('deliveredAt', DateType::class, [
                'input_format' => 'dd-MM-yyyy',
                'required' => false,
                'constraints' => [
                    new Date(),
//                    new GreaterThan(['property_path' => 'shippedAt'])
                ],
            ])
            ->add('rating', RangeType::class, [
                'attr' => [
                    'min' => 0,
                    'max' => 5,
                ]
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
            'data_class' => QualityCheck::class,
        ]);
    }
}
