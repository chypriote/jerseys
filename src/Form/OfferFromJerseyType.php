<?php

declare(strict_types=1);

namespace App\Form;

use App\Entity\Jersey;
use App\Entity\Offer;
use App\Enum\JerseyFormat;
use App\Enum\JerseySizes;
use App\Form\Type\SellerAutocompleteField;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Routing\RouterInterface;

class OfferFromJerseyType extends AbstractType
{
    public function __construct(private readonly RouterInterface $router)
    {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->setAction($this->router->generate('admin.jerseys.create_offer', ['slug' => $options['jersey']]))
            ->add('seller', SellerAutocompleteField::class)
            ->add('jersey', EntityType::class, [
                'class' => Jersey::class,
                'choice_label' => static fn (Jersey $jersey): string => $jersey->getSlug(),
                'attr' => ['style' => 'display: none'],
                'label_attr' => ['style' => 'display: none'],
            ])
            ->add('url', TextType::class)
            ->add('price', MoneyType::class, [
                'currency' => 'USD',
            ])
            ->add('format', EnumType::class, [
                'class' => JerseyFormat::class,
                'multiple' => false,
                'expanded' => true,
            ])
            ->add('sizes', EnumType::class, [
                'class' => JerseySizes::class,
                'multiple' => true,
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
            'jersey' => null,
        ]);
        $resolver->setAllowedTypes('jersey', 'string');
    }
}
