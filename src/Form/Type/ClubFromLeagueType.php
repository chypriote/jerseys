<?php

declare(strict_types=1);

namespace App\Form\Type;

use App\Entity\Club;
use App\Entity\League;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Validator\Constraints\Image;
use Symfony\UX\Dropzone\Form\DropzoneType;

class ClubFromLeagueType extends AbstractType
{
    public function __construct(private readonly RouterInterface $router)
    {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->setAction($this->router->generate('admin.leagues.create_club', ['slug' => $options['league']]))
            ->add('name', TextType::class)
            ->add('league', EntityType::class, [
                'class' => League::class,
                'choice_label' => static fn (League $club): string => $club->getSlug(),
                'attr' => ['style' => 'display: none'],
                'label_attr' => ['style' => 'display: none'],
            ])
            ->add('logo', DropzoneType::class, [
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new Image(),
                ],
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
            'data_class' => Club::class,
            'league' => null,
        ]);
        $resolver->setAllowedTypes('league', 'string');
    }
}
