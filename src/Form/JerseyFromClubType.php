<?php

declare(strict_types=1);

namespace App\Form;

use App\Entity\Club;
use App\Entity\Event;
use App\Entity\Jersey;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Validator\Constraints\Image;
use Symfony\UX\Dropzone\Form\DropzoneType;

class JerseyFromClubType extends AbstractType
{
    public function __construct(private readonly RouterInterface $router, private readonly EntityManagerInterface $entityManager)
    {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $events = $this->entityManager->getRepository(Event::class)->findAll();
        $builder
            ->setAction($this->router->generate('admin.clubs.create_jersey', ['slug' => $options['club']]))
            ->add('club', EntityType::class, [
                'class' => Club::class,
                'choice_label' => static fn (Club $club): string => $club->getSlug(),
                'attr' => ['style' => 'display: none'],
                'label_attr' => ['style' => 'display: none'],
            ])
            ->add('type', EnumType::class, ['class' => \App\Enum\JerseyType::class])
            ->add('event', ChoiceType::class, [
                'choices' => $events,
                'choice_label' => static fn (Event $event) => $event->getName(),
                'choice_value' => 'id',
            ])
            ->add('picture', DropzoneType::class, [
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
            'data_class' => Jersey::class,
            'club' => null,
        ]);
        $resolver->setAllowedTypes('club', 'string');
    }
}
